import AuditTable from "../components/AuditTable";

export default function AuditPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <div className="mt-4">
        <AuditTable />
      </div>
    </main>
  );
}
