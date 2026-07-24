import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plug, Plus, Trash2 } from "lucide-react";
import {
  deleteConnectorAccount,
  insertConnectorAccount,
  setConnectorAccountActive,
  type ConnectorAccount,
  type WindsorConnector,
} from "@/lib/windsorApi";

const CONNECTOR_COPY: Record<
  WindsorConnector,
  { title: string; idLabel: string; placeholder: string; hint: string }
> = {
  searchconsole: {
    title: "Search Console properties",
    idLabel: "Site URL",
    placeholder: "https://www.example.com/",
    hint: "Must match the property exactly as it appears in Windsor (protocol, www, trailing slash).",
  },
  google_ads: {
    title: "Google Ads accounts",
    idLabel: "Customer ID",
    placeholder: "123-456-7890",
    hint: "The Google Ads customer ID as shown in Windsor, e.g. 960-512-0559.",
  },
};

interface ConnectorAccountsCardProps {
  clientId: string;
  connector: WindsorConnector;
  accounts: ConnectorAccount[];
  /** Prefill suggestion for the GSC site URL (client's website_url). */
  suggestedAccountId?: string | null;
}

/** Admin/FMM management of client → Windsor account mappings, rendered inline
 *  on the tab it configures (same precedent as the share-link card). */
export function ConnectorAccountsCard({
  clientId,
  connector,
  accounts,
  suggestedAccountId,
}: ConnectorAccountsCardProps) {
  const copy = CONNECTOR_COPY[connector];
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState("");
  const [label, setLabel] = useState("");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["windsor", connector] });

  const addMutation = useMutation({
    mutationFn: () => insertConnectorAccount(clientId, connector, accountId, label),
    onSuccess: () => {
      setAccountId("");
      setLabel("");
      toast.success("Account mapped — run Refresh now to pull data");
      invalidate();
    },
    onError: (error: any) => toast.error("Failed to add account", { description: error?.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setConnectorAccountActive(id, isActive),
    onSuccess: invalidate,
    onError: (error: any) => toast.error("Update failed", { description: error?.message }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteConnectorAccount(id),
    onSuccess: () => {
      toast.success("Account mapping removed");
      invalidate();
    },
    onError: (error: any) => toast.error("Delete failed", { description: error?.message }),
  });

  return (
    <Card>
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{copy.title}</span>
          <Badge variant="outline">{accounts.length} mapped</Badge>
        </div>

        {accounts.length > 0 && (
          <ul className="space-y-1.5">
            {accounts.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  <span className="font-mono text-xs">{account.account_id}</span>
                  {account.label && (
                    <span className="text-muted-foreground ml-2">{account.label}</span>
                  )}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {account.last_synced_at
                      ? `synced ${new Date(account.last_synced_at).toLocaleDateString()}`
                      : "never synced"}
                  </span>
                  <Switch
                    checked={account.is_active}
                    onCheckedChange={(isActive) =>
                      toggleMutation.mutate({ id: account.id, isActive })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removeMutation.mutate(account.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="h-8 w-64 text-sm"
            placeholder={copy.placeholder}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
          <Input
            className="h-8 w-40 text-sm"
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!accountId.trim() || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-1" />
            )}
            Add
          </Button>
          {connector === "searchconsole" && suggestedAccountId && !accountId && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => setAccountId(suggestedAccountId)}
            >
              Use {suggestedAccountId}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{copy.hint}</p>
      </CardContent>
    </Card>
  );
}
