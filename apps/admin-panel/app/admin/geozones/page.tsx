import { redirect } from 'next/navigation';

export default function AdminGeoZonesPage() {
  redirect('/admin/zones?tab=geozones');
}
