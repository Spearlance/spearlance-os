export function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]" role="status">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      <span className="sr-only">Loading...</span>
    </div>
  );
}
