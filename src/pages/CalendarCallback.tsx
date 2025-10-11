import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function CalendarCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');

      if (error) {
        navigate('/settings?calendar_connected=false&error=' + error);
        return;
      }

      if (success === 'true') {
        navigate('/settings?calendar_connected=true');
        return;
      }

      // Fallback
      navigate('/settings');
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Completing calendar connection...</p>
      </div>
    </div>
  );
}
