import { AccessGate } from './components/AccessGate'
import { ConversationInterview } from './components/ConversationInterview'
import { useInterviewStore } from './store/useInterviewStore'

export default function App() {
  const status = useInterviewStore((s) => s.status)

  if (status === 'auth') return <AccessGate />
  return <ConversationInterview />
}
