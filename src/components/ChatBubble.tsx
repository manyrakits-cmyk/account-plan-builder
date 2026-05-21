interface Props {
  role: 'ai' | 'user'
  content: string
  isTyping?: boolean
}

export function ChatBubble({ role, content, isTyping }: Props) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={[
          'max-w-[88%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap',
          role === 'ai'
            ? 'bg-gray-100 text-gray-900 border border-gray-200'
            : 'bg-white text-gray-900 border border-gray-300',
          isTyping ? 'text-gray-400 italic' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {content}
      </div>
    </div>
  )
}
