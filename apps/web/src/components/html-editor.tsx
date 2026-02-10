'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  Link2,
  Eye,
  Code,
  Minus,
  Type,
} from 'lucide-react'

type HtmlEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

type ToolbarAction = {
  icon: React.ReactNode
  label: string
  action: () => void
}

export function HtmlEditor({ value, onChange, placeholder, rows = 18 }: HtmlEditorProps) {
  const [preview, setPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const wrapSelection = useCallback(
    (before: string, after: string) => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = value.slice(start, end)
      const replacement = `${before}${selected || 'texto'}${after}`
      const newValue = value.slice(0, start) + replacement + value.slice(end)
      onChange(newValue)
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        ta.focus()
        const cursorPos = start + before.length + (selected || 'texto').length
        ta.setSelectionRange(cursorPos, cursorPos)
      })
    },
    [value, onChange],
  )

  const insertAtCursor = useCallback(
    (text: string) => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const newValue = value.slice(0, start) + text + value.slice(start)
      onChange(newValue)
      requestAnimationFrame(() => {
        ta.focus()
        const cursorPos = start + text.length
        ta.setSelectionRange(cursorPos, cursorPos)
      })
    },
    [value, onChange],
  )

  const tools: ToolbarAction[] = [
    {
      icon: <Heading2 className="w-4 h-4" />,
      label: 'Titulo (H2)',
      action: () => wrapSelection('<h2>', '</h2>'),
    },
    {
      icon: <Heading3 className="w-4 h-4" />,
      label: 'Subtitulo (H3)',
      action: () => wrapSelection('<h3>', '</h3>'),
    },
    {
      icon: <Type className="w-4 h-4" />,
      label: 'Paragrafo',
      action: () => wrapSelection('<p>', '</p>'),
    },
    {
      icon: <Bold className="w-4 h-4" />,
      label: 'Negrito',
      action: () => wrapSelection('<strong>', '</strong>'),
    },
    {
      icon: <Italic className="w-4 h-4" />,
      label: 'Italico',
      action: () => wrapSelection('<em>', '</em>'),
    },
    {
      icon: <List className="w-4 h-4" />,
      label: 'Lista',
      action: () => insertAtCursor('\n<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n'),
    },
    {
      icon: <Link2 className="w-4 h-4" />,
      label: 'Link',
      action: () => wrapSelection('<a href="https://">', '</a>'),
    },
    {
      icon: <Minus className="w-4 h-4" />,
      label: 'Separador',
      action: () => insertAtCursor('\n<hr />\n'),
    },
  ]

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">Conteudo (HTML)</label>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-sm transition-colors ${
            preview
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:text-foreground hover:bg-surface-light'
          }`}
        >
          {preview ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {preview ? 'Editar' : 'Visualizar'}
        </button>
      </div>

      {preview ? (
        <div className="min-h-[300px] max-h-[500px] overflow-y-auto px-4 py-3 rounded-sm bg-surface-light border border-border">
          {value ? (
            <div
              className="prose prose-invert prose-sm max-w-none text-muted [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_hr]:border-border [&_hr]:my-4"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          ) : (
            <p className="text-sm text-muted italic">Nenhum conteudo para visualizar</p>
          )}
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-t-sm bg-surface border border-border border-b-0">
            {tools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={tool.action}
                title={tool.label}
                className="p-1.5 text-muted hover:text-foreground hover:bg-surface-light rounded-sm transition-colors"
              >
                {tool.icon}
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 rounded-b-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-sm -mt-1.5"
          />
        </>
      )}

      <p className="text-xs text-muted">
        Tags suportadas: h2, h3, p, ul, li, a, strong, em, hr
      </p>
    </div>
  )
}
