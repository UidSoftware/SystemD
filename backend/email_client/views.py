from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from . import services
from usuarios.permissions import IsAdminOrOperacionalOrFinanceiro


def _get_credenciais(request):
    config = getattr(request.user, 'email_config', None)
    if not config or not config.ativo:
        raise ValueError("Conta de email não configurada para este usuário.")
    return config.email_conta, config.email_senha


class InboxView(APIView):
    permission_classes = [IsAdminOrOperacionalOrFinanceiro]

    def get(self, request):
        try:
            email_conta, email_senha = _get_credenciais(request)
            pagina = int(request.query_params.get("page", 1))
            pasta = request.query_params.get("pasta", "INBOX")
            return Response(services.listar_inbox(email_conta, email_senha, pagina=pagina, pasta=pasta))
        except ValueError as e:
            return Response({"erro": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EmailDetailView(APIView):
    permission_classes = [IsAdminOrOperacionalOrFinanceiro]

    def get(self, request, uid):
        try:
            email_conta, email_senha = _get_credenciais(request)
            pasta = request.query_params.get("pasta", "INBOX")
            return Response(services.ler_email(email_conta, email_senha, int(uid), pasta=pasta))
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EnviarEmailView(APIView):
    permission_classes = [IsAdminOrOperacionalOrFinanceiro]

    def post(self, request):
        try:
            email_conta, email_senha = _get_credenciais(request)
            destinatario = request.data.get("destinatario")
            assunto = request.data.get("assunto")
            corpo = request.data.get("corpo", "")
            corpo_html = request.data.get("corpo_html", None)
            cc = request.data.get("cc") or None

            if not destinatario or not assunto:
                return Response({"erro": "destinatario e assunto são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)

            return Response(
                services.enviar_email(email_conta, email_senha, destinatario, assunto, corpo, corpo_html, cc),
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResponderEmailView(APIView):
    permission_classes = [IsAdminOrOperacionalOrFinanceiro]

    def post(self, request, uid):
        try:
            email_conta, email_senha = _get_credenciais(request)
            pasta = request.query_params.get("pasta", "INBOX")
            original = services.ler_email(email_conta, email_senha, int(uid), pasta=pasta)
            return Response(
                services.enviar_email(
                    email_conta, email_senha,
                    original["remetente"],
                    f"Re: {original['assunto']}",
                    request.data.get("corpo", "")
                ),
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DeletarEmailView(APIView):
    permission_classes = [IsAdminOrOperacionalOrFinanceiro]

    def delete(self, request, uid):
        try:
            email_conta, email_senha = _get_credenciais(request)
            pasta = request.query_params.get("pasta", "INBOX")
            return Response(services.deletar_email(email_conta, email_senha, int(uid), pasta=pasta))
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PastasView(APIView):
    permission_classes = [IsAdminOrOperacionalOrFinanceiro]

    def get(self, request):
        try:
            email_conta, email_senha = _get_credenciais(request)
            return Response(services.listar_pastas(email_conta, email_senha))
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DownloadAnexoView(APIView):
    permission_classes = [IsAdminOrOperacionalOrFinanceiro]

    def get(self, request, uid):
        try:
            email_conta, email_senha = _get_credenciais(request)
            pasta = request.query_params.get("pasta", "INBOX")
            indice = int(request.query_params.get("indice", 0))
            conteudo, content_type, nome = services.baixar_anexo(email_conta, email_senha, int(uid), indice, pasta=pasta)
            response = HttpResponse(conteudo, content_type=content_type)
            response["Content-Disposition"] = f'attachment; filename="{nome}"'
            return response
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ArquivarEmailView(APIView):
    permission_classes = [IsAdminOrOperacionalOrFinanceiro]

    def post(self, request, uid):
        try:
            email_conta, email_senha = _get_credenciais(request)
            pasta = request.query_params.get("pasta", "INBOX")
            return Response(services.arquivar_email(email_conta, email_senha, int(uid), pasta=pasta))
        except Exception as e:
            return Response({"erro": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
