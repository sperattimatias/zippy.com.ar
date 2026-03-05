import { redirect } from 'next/navigation';

export default function FraudPage() {
  redirect('/admin/safety-alerts');
}
