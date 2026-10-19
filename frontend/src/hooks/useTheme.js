import { useCallback, useState } from 'react'

const STORAGE_KEY = 'systemd-theme'

function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

/**
 * Tema claro/escuro do SystemD — Manutenção #67.
 * Default é o tema escuro (mesma decisão do UidCore): nasce ativado no
 * primeiro acesso, sem depender de prefers-color-scheme do SO — só muda
 * se o usuário escolher. Usa atributo data-theme no <html> (não classe
 * 'dark'), porque o SystemD estiliza via CSS custom properties, não
 * variantes dark: do Tailwind (ver Especificacao_Hotfix.md, secao 2.3).
 * O estado inicial é lido do atributo já aplicado em <html> pelo script
 * anti-FOUC em index.html (roda antes do React montar) — primeiro render
 * já nasce sincronizado com o localStorage, sem flash.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') !== 'light'
  )

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      applyTheme(next)
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      return next
    })
  }, [])

  return { isDark, toggleTheme }
}
