import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import decode_header
from django.conf import settings
from imapclient import IMAPClient


def _decode_header(value):
    if not value:
        return ""
    decoded_parts = decode_header(value)
    result = []
    for part, encoding in decoded_parts:
        if isinstance(part, bytes):
            result.append(part.decode(encoding or "utf-8", errors="replace"))
        else:
            result.append(part)
    return " ".join(result)


def _get_imap_client(email_conta, email_senha):
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    client = IMAPClient(
        host=settings.IMAP_HOST,
        port=int(settings.IMAP_PORT),
        ssl=settings.IMAP_USE_SSL == "True",
        ssl_context=ssl_context,
        timeout=10,
    )
    client.login(email_conta, email_senha)
    return client


def listar_inbox(email_conta, email_senha, pagina=1, page_size=20, pasta="INBOX"):
    client = None
    try:
        client = _get_imap_client(email_conta, email_senha)
        client.select_folder(pasta, readonly=True)

        uids = list(reversed(client.search(["ALL"])))

        inicio = (pagina - 1) * page_size
        uids_pagina = uids[inicio:inicio + page_size]

        if not uids_pagina:
            return {"count": len(uids), "results": []}

        mensagens = client.fetch(uids_pagina, ["ENVELOPE", "FLAGS", "RFC822.SIZE"])

        emails = []
        for uid, dados in mensagens.items():
            envelope = dados.get(b"ENVELOPE")
            flags = dados.get(b"FLAGS", [])

            remetente = ""
            if envelope.from_:
                f = envelope.from_[0]
                nome = _decode_header(f.name.decode() if f.name else "")
                mailbox = f.mailbox.decode() if f.mailbox else ""
                host = f.host.decode() if f.host else ""
                remetente = f"{nome} <{mailbox}@{host}>" if nome else f"{mailbox}@{host}"

            emails.append({
                "uid": uid,
                "assunto": _decode_header(envelope.subject.decode() if envelope.subject else ""),
                "remetente": remetente,
                "data": str(envelope.date) if envelope.date else "",
                "lido": b"\\Seen" in flags,
                "tamanho": dados.get(b"RFC822.SIZE", 0),
            })

        return {"count": len(uids), "results": emails}

    except Exception as e:
        raise Exception(f"Erro ao listar inbox: {str(e)}")
    finally:
        if client:
            client.logout()


def ler_email(email_conta, email_senha, uid, pasta="INBOX"):
    client = None
    try:
        client = _get_imap_client(email_conta, email_senha)
        client.select_folder(pasta)
        client.add_flags([uid], ["\\Seen"])

        mensagens = client.fetch([uid], ["RFC822"])
        if uid not in mensagens:
            raise Exception("Email não encontrado.")

        import email as email_lib
        msg = email_lib.message_from_bytes(mensagens[uid][b"RFC822"])

        corpo_texto = ""
        corpo_html = ""
        anexos = []

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                disposition = str(part.get("Content-Disposition", ""))

                if "attachment" in disposition:
                    anexos.append({"nome": part.get_filename() or "anexo", "tipo": content_type})
                elif content_type == "text/plain":
                    corpo_texto = part.get_payload(decode=True).decode("utf-8", errors="replace")
                elif content_type == "text/html":
                    corpo_html = part.get_payload(decode=True).decode("utf-8", errors="replace")
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                corpo_texto = payload.decode("utf-8", errors="replace")

        return {
            "uid": uid,
            "assunto": _decode_header(msg.get("Subject", "")),
            "remetente": _decode_header(msg.get("From", "")),
            "destinatarios": _decode_header(msg.get("To", "")),
            "data": msg.get("Date", ""),
            "corpo_texto": corpo_texto,
            "corpo_html": corpo_html,
            "anexos": anexos,
        }

    except Exception as e:
        raise Exception(f"Erro ao ler email: {str(e)}")
    finally:
        if client:
            client.logout()


def enviar_email(email_conta, email_senha, destinatario, assunto, corpo, corpo_html=None, cc=None):
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = email_conta
        msg["To"] = destinatario
        msg["Subject"] = assunto
        if cc:
            msg["CC"] = cc
        msg.attach(MIMEText(corpo, "plain", "utf-8"))
        if corpo_html:
            msg.attach(MIMEText(corpo_html, "html", "utf-8"))

        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT), timeout=10) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(email_conta, email_senha)
            destinatarios = [destinatario] + ([cc] if cc else [])
            server.sendmail(email_conta, destinatarios, msg.as_string())

        return {"status": "enviado"}

    except Exception as e:
        raise Exception(f"Erro ao enviar email: {str(e)}")


def deletar_email(email_conta, email_senha, uid, pasta="INBOX"):
    client = None
    try:
        client = _get_imap_client(email_conta, email_senha)
        client.select_folder(pasta)

        pastas_lixeira = ["Trash", "Lixeira", "[Gmail]/Trash", "INBOX.Trash"]
        pastas = [p.decode() if isinstance(p, bytes) else p for _, _, p in client.list_folders()]
        pasta_destino = next((p for p in pastas_lixeira if p in pastas), None)

        if pasta_destino:
            client.move([uid], pasta_destino)
        else:
            client.add_flags([uid], ["\\Deleted"])
            client.expunge()

        return {"status": "deletado"}

    except Exception as e:
        raise Exception(f"Erro ao deletar email: {str(e)}")
    finally:
        if client:
            client.logout()


def listar_pastas(email_conta, email_senha):
    client = None
    try:
        client = _get_imap_client(email_conta, email_senha)
        pastas_raw = client.list_folders()
        pastas = [{"nome": nome.decode() if isinstance(nome, bytes) else nome} for _, _, nome in pastas_raw]
        return {"results": pastas}

    except Exception as e:
        raise Exception(f"Erro ao listar pastas: {str(e)}")
    finally:
        if client:
            client.logout()
