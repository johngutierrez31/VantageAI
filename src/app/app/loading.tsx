export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-24 w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
        <div className="skeleton h-28" />
      </div>
      <div className="skeleton h-80 w-full" />
    </div>
  );
}
