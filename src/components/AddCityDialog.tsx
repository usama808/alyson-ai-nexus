import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCity } from "@/hooks/use-live-feed";
import { isLiveApiEnabled } from "@/lib/api-client";
import type { LiveCity } from "@/lib/types";
import { normalizeStateCode, US_STATES } from "@/lib/us-states";

export type CreateCityForm = {
  name: string;
  state: string;
  subdomain: string;
  population: string;
  status: "active" | "paused";
};

const EMPTY_FORM: CreateCityForm = {
  name: "",
  state: "",
  subdomain: "",
  population: "",
  status: "active",
};

function suggestSubdomain(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 4);
  return base ? `${base}.alyson.news` : "";
}

type AddCityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (city: LiveCity) => void;
};

export function AddCityDialog({ open, onOpenChange, onCreated }: AddCityDialogProps) {
  const live = isLiveApiEnabled();
  const createCity = useCreateCity();
  const [form, setForm] = useState<CreateCityForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [subdomainTouched, setSubdomainTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setError(null);
      setSubdomainTouched(false);
    }
  }, [open]);

  useEffect(() => {
    if (subdomainTouched || !form.name.trim()) return;
    const suggested = suggestSubdomain(form.name);
    if (suggested) setForm((f) => ({ ...f, subdomain: suggested }));
  }, [form.name, subdomainTouched]);

  const set = (key: keyof CreateCityForm, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    const stateCode = normalizeStateCode(form.state);
    const subdomain = form.subdomain.trim();
    const population = Number(form.population.replace(/,/g, ""));

    if (name.length < 2) {
      setError("Enter a city name (at least 2 characters).");
      return;
    }
    if (!stateCode) {
      setError("Select a state from the list.");
      return;
    }
    if (subdomain.length < 3) {
      setError("Enter a subdomain (e.g. den.alyson.news).");
      return;
    }
    if (!Number.isFinite(population) || population < 0) {
      setError("Enter a valid population.");
      return;
    }

    const payload = {
      name,
      state: stateCode,
      subdomain,
      population: Math.floor(population),
      status: form.status,
    };

    if (live) {
      try {
        const city = await createCity.mutateAsync(payload);
        onCreated(city);
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create city.");
      }
      return;
    }

    const mockCity: LiveCity = {
      id: Date.now(),
      name,
      state: stateCode,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      subdomain,
      population: Math.floor(population),
      status: form.status,
      articles: 0,
      clicks: 0,
      ctr: 0,
      revenue: 0,
      subscribers: 0,
      topCategory: "Local News",
    };
    onCreated(mockCity);
    onOpenChange(false);
  };

  const pending = createCity.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add city</DialogTitle>
            <DialogDescription>
              Create a new local news network. Metrics start at zero until content is ingested.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="city-name">City name</Label>
              <Input
                id="city-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Denver"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="city-state">State</Label>
                <select
                  id="city-state"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select state…</option>
                  {US_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city-status">Status</Label>
                <select
                  id="city-status"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city-subdomain">Subdomain</Label>
              <Input
                id="city-subdomain"
                value={form.subdomain}
                onChange={(e) => {
                  setSubdomainTouched(true);
                  set("subdomain", e.target.value);
                }}
                placeholder="den.alyson.news"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city-population">Population</Label>
              <Input
                id="city-population"
                type="number"
                min={0}
                value={form.population}
                onChange={(e) => set("population", e.target.value)}
                placeholder="715000"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create city"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
