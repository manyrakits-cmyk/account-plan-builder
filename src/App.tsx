import { AccessGate } from './components/AccessGate'
import { ConversationInterview } from './components/ConversationInterview'
import { OnboardingScreen } from './components/OnboardingScreen'
import { ProjectListScreen } from './components/ProjectListScreen'
import { useInterviewStore } from './store/useInterviewStore'

export default function App() {
  const status = useInterviewStore((s) => s.status)

  if (status === 'auth') return <AccessGate />
  if (status === 'onboarding') return <OnboardingScreen />
  if (status === 'project_list') return <ProjectListScreen />
  return <ConversationInterview />
}
