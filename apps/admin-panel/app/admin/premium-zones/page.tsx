import { redirect } from 'next/navigation';

export default function PremiumZonesPage() {
  redirect('/admin/zones?tab=premium');
}
