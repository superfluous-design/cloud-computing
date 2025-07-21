import { createFileRoute } from '@tanstack/react-router'
import Header from '@/components/Header'
import { MainSection } from '@/components/MainSection'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <>
      <Header />
      <MainSection />
    </>
  )
}
