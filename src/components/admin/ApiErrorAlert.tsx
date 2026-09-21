import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { publicErrorMessage, networkErrorMessage } from '@/lib/admin/http-error';

export function ApiErrorAlert({
  message,
  status,
}: {
  message?: string | null;
  status?: number;
}) {
  const text =
    !message && !status
      ? networkErrorMessage()
      : publicErrorMessage(status, message);

  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Unable to complete this request</AlertTitle>
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}
