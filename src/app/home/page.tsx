import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const metadata: Metadata = {
  title: 'SmartQ – AI service desk',
  description: 'Describe an IT problem in plain language. SmartQ classifies it, sets the priority, routes it to the right team and tracks the SLA.',
  alternates: { canonical: '/home' },
};

export default function HomePage() {
  return <HomeClient />;
}
