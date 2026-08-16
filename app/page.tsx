import FlagsTable from "./components/FlagsTable";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Feature Flags</h1>
      <div className="mt-4">
        <FlagsTable />
      </div>
    </main>
  );
}
