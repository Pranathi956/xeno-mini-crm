import { useListCampaigns, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Campaigns() {
  const { data: campaigns, isLoading } = useListCampaigns({
    query: {
      queryKey: getListCampaignsQueryKey()
    }
  });

  if (isLoading) return <div className="p-8">Loading campaigns...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
                <TableHead className="text-right">Opened</TableHead>
                <TableHead className="text-right">Clicked</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right pr-6">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.length ? campaigns.map((campaign) => {
                const total = campaign.stats?.totalSent || 0;
                const delivered = campaign.stats?.delivered || 0;
                const opened = campaign.stats?.opened || 0;
                const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;
                const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;

                return (
                  <TableRow key={campaign.id} className="cursor-pointer hover:bg-secondary/20">
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-2">
                        {campaign.name}
                        {campaign.sentByAi && (
                          <Badge variant="outline" className="text-[10px] px-1.5 h-4 bg-primary/10 text-primary border-primary/20">AI</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="uppercase text-xs font-bold tracking-wider">{campaign.channel}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className="capitalize" variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{total.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{delivered.toLocaleString()}</span>
                        {total > 0 && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 w-14 justify-center">
                            {deliveryRate.toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{opened.toLocaleString()}</span>
                        {delivered > 0 && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 w-14 justify-center">
                            {openRate.toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{campaign.stats?.clicked?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-right text-destructive">{campaign.stats?.failed?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-right pr-6 text-muted-foreground">
                      {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No campaigns found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
