"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Badge, Button, Card, Empty, Input, Modal, PageHeader, Select } from "@/components/ui";
import ClientForm, { emptyClient } from "@/components/ClientForm";
import { SERVICES } from "@/lib/types";
import { clientBalance, inr, statusTone } from "@/lib/format";

export default function ClientsPage() {
  const { db, user, isAdmin, update, userName } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [service, setService] = useState("All");
  const [adding, setAdding] = useState(false);

  const list = (isAdmin ? db.clients : db.clients.filter((c) => c.assignedTo === user!.id))
    .filter((c) => {
      const t = q.trim().toLowerCase();
      if (t && !`${c.name} ${c.business} ${c.phone} ${c.city}`.toLowerCase().includes(t)) return false;
      if (status !== "All" && c.status !== status) return false;
      if (service !== "All" && !c.services.includes(service)) return false;
      return true;
    })
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${list.length} clients`}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> Naya client
          </Button>
        }
      />

      <Card className="mb-4 p-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_160px_160px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Naam, business, phone ya city se search" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "All", label: "Saare status" }, "Active", "VIP", "Inactive"]} />
          <Select value={service} onChange={(e) => setService(e.target.value)} options={[{ value: "All", label: "Saari services" }, ...SERVICES]} />
        </div>
      </Card>

      {list.length === 0 ? (
        <Card><Empty text="Koi client nahi mila" /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => {
            const bal = clientBalance(db, c.id);
            return (
              <Link key={c.id} href={`/clients/${c.id}`}>
                <Card className="h-full p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-semibold text-emerald-700">
                        {c.business.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{c.business}</p>
                        <p className="truncate text-sm text-slate-500">{c.name} · {c.city}</p>
                      </div>
                    </div>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.services.map((s) => (
                      <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{s}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span>{userName(c.assignedTo)}</span>
                    {isAdmin && (bal > 0 ? <span className="font-medium text-red-600">Baaki {inr(bal)}</span> : <span className="font-medium text-emerald-600">Fully paid</span>)}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={adding} onClose={() => setAdding(false)} title="Naya client add karein" wide>
        <ClientForm
          initial={emptyClient(user!.id)}
          onCancel={() => setAdding(false)}
          onSave={(c) => {
            const id = uid("c");
            update((d) => ({ ...d, clients: [...d.clients, { ...c, id }] }));
            setAdding(false);
            router.push(`/clients/${id}`);
          }}
        />
      </Modal>
    </div>
  );
}
