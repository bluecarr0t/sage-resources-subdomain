import { redirect } from 'next/navigation';
import { DEFAULT_ADMIN_PATH } from '@/lib/admin-ui';

export default function AdminPage() {
  redirect(DEFAULT_ADMIN_PATH);
}
