'use client';

import { useRouter } from 'next/navigation';
import OnboardingBot from '../components/OnboardingBot';

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = () => {
    // Quando terminar as perguntas, manda o cara de volta para a Home (Dashboard)
    router.push('/');
  };

  return <OnboardingBot onComplete={handleComplete} />;
}