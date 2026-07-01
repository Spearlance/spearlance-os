import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Image,
  FileVideo,
  FileAudio,
  Link as LinkIcon,
  ExternalLink,
  X,
  Plus,
  Globe,
  ChevronLeft,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NavigateFunction } from "react-router-dom";
import { LinkAssetDialog } from "./LinkAssetDialog";

interface LinkedWebsitePage {
  id: string;
  name: string;
  build_id: string;
  build_name: string;
}

interface RelatedTabProps {
  // Related items
  relatedAssets: any[];
  relatedMeetings: any[];
  relatedChannels: any[];
  linkedWebsitePage: LinkedWebsitePage | null;
  // Dialog visibility
  showLinkAssetDialog: boolean;
  setShowLinkAssetDialog: (open: boolean) => void;
  showLinkMeetingDialog: boolean;
  setShowLinkMeetingDialog: (open: boolean) => void;
  showLinkChannelDialog: boolean;
  setShowLinkChannelDialog: (open: boolean) => void;
  showLinkWebsiteDialog: boolean;
  setShowLinkWebsiteDialog: (open: boolean) => void;
  // Asset linking (multi-select + upload dialog)
  clientId: string;
  onLinkAssets: (assetIds: string[]) => Promise<void> | void;
  // Available items for linking
  availableMeetings: any[];
  availableChannels: any[];
  availableBuilds: any[];
  availablePages: any[];
  // Build/page selection state
  selectedBuildForPage: string | null;
  setSelectedBuildForPage: (id: string | null) => void;
  setAvailablePages: (pages: any[]) => void;
  // Handlers
  handleUnlinkAsset: (assetId: string) => void;
  handleLinkMeeting: (meetingId: string) => void;
  handleUnlinkMeeting: (meetingId: string) => void;
  handleLinkChannel: (channelId: string) => void;
  handleUnlinkChannel: (channelId: string) => void;
  handleLinkWebsitePage: (buildId: string, pageId?: string) => void;
  handleUnlinkWebsitePage: () => void;
  loadAvailableMeetings: () => void;
  loadAvailableChannels: () => void;
  loadAvailableBuilds: () => void;
  loadAvailablePages: (buildId: string) => void;
  extractMeetingTitle: (summary: string) => string;
  navigate: NavigateFunction;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "image":
      return <Image className="h-4 w-4" />;
    case "video":
      return <FileVideo className="h-4 w-4" />;
    case "audio":
      return <FileAudio className="h-4 w-4" />;
    case "document":
      return <FileText className="h-4 w-4" />;
    default:
      return <LinkIcon className="h-4 w-4" />;
  }
}

export function RelatedTab({
  relatedAssets,
  relatedMeetings,
  relatedChannels,
  linkedWebsitePage,
  showLinkAssetDialog,
  setShowLinkAssetDialog,
  showLinkMeetingDialog,
  setShowLinkMeetingDialog,
  showLinkChannelDialog,
  setShowLinkChannelDialog,
  showLinkWebsiteDialog,
  setShowLinkWebsiteDialog,
  clientId,
  onLinkAssets,
  availableMeetings,
  availableChannels,
  availableBuilds,
  availablePages,
  selectedBuildForPage,
  setSelectedBuildForPage,
  setAvailablePages,
  handleUnlinkAsset,
  handleLinkMeeting,
  handleUnlinkMeeting,
  handleLinkChannel,
  handleUnlinkChannel,
  handleLinkWebsitePage,
  handleUnlinkWebsitePage,
  loadAvailableMeetings,
  loadAvailableChannels,
  loadAvailableBuilds,
  loadAvailablePages,
  extractMeetingTitle,
  navigate,
}: RelatedTabProps) {
  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-6">
        {/* Linked Website Build/Page */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Website Build/Page</h3>
            {!linkedWebsitePage && (
              <Dialog
                open={showLinkWebsiteDialog}
                onOpenChange={(open) => {
                  setShowLinkWebsiteDialog(open);
                  if (!open) {
                    setSelectedBuildForPage(null);
                    setAvailablePages([]);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      loadAvailableBuilds();
                      setSelectedBuildForPage(null);
                      setAvailablePages([]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Link Build/Page
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedBuildForPage
                        ? "Select Page (Optional)"
                        : "Select Website Build"}
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[400px] pr-4">
                    {!selectedBuildForPage ? (
                      <div className="space-y-2">
                        {availableBuilds.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No website builds found
                          </p>
                        ) : (
                          availableBuilds.map((build) => (
                            <Card
                              key={build.id}
                              className="cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => {
                                setSelectedBuildForPage(build.id);
                                loadAvailablePages(build.id);
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{build.name}</div>
                                  <Badge variant="outline">{build.status}</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mb-2"
                          onClick={() => {
                            setSelectedBuildForPage(null);
                            setAvailablePages([]);
                          }}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Back to Builds
                        </Button>
                        <Card
                          className="cursor-pointer hover:bg-accent transition-colors border-dashed"
                          onClick={() => handleLinkWebsitePage(selectedBuildForPage)}
                        >
                          <CardContent className="p-4 text-center text-muted-foreground">
                            Link to Build only (no specific page)
                          </CardContent>
                        </Card>
                        {availablePages.map((page) => (
                          <Card
                            key={page.id}
                            className="cursor-pointer hover:bg-accent transition-colors"
                            onClick={() =>
                              handleLinkWebsitePage(selectedBuildForPage, page.id)
                            }
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{page.page_name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {page.page_type || "Custom"}
                                  </div>
                                </div>
                                <Badge variant="outline">{page.status}</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {linkedWebsitePage ? (
            <div
              className="relative group flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
              onClick={() =>
                navigate(`/website/builds/${linkedWebsitePage.build_id}`)
              }
            >
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlinkWebsitePage();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{linkedWebsitePage.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {linkedWebsitePage.build_name}
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground mr-8" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No website build/page linked
            </p>
          )}
        </div>

        {/* Related Channels */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Related Channels</h3>
            <Dialog
              open={showLinkChannelDialog}
              onOpenChange={setShowLinkChannelDialog}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAvailableChannels}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Link Channel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Channel to Task</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {availableChannels.map((channel) => (
                      <Card
                        key={channel.id}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleLinkChannel(channel.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{channel.name}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                Stage: {channel.marketing_flow_stages.name}
                              </div>
                            </div>
                            <Badge variant="outline">{channel.status}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          {relatedChannels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No channels linked to this task
            </p>
          ) : (
            <div className="space-y-2">
              {relatedChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="relative group flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                  onClick={() => navigate("/marketing/flow")}
                >
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkChannel(channel.id);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 pr-8">
                    <div className="font-medium text-sm">{channel.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Stage: {channel.marketing_flow_stages.name}
                    </div>
                  </div>
                  <Badge variant="outline">{channel.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Assets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Related Assets</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLinkAssetDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Link Assets
            </Button>
          </div>
          <LinkAssetDialog
            open={showLinkAssetDialog}
            onOpenChange={setShowLinkAssetDialog}
            clientId={clientId}
            linkedAssetIds={relatedAssets.map((a) => a.id)}
            onConfirm={onLinkAssets}
          />
          {relatedAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assets linked to this task
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {relatedAssets.map((asset) => (
                <Card
                  key={asset.id}
                  className="relative group cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate("/assets")}
                >
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkAsset(asset.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {asset.preview_url ||
                      (asset.type === "image" && asset.file_url) ? (
                        <div className="w-full h-24 bg-muted rounded overflow-hidden">
                          <img
                            src={asset.preview_url || asset.file_url}
                            alt={asset.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
                          {getTypeIcon(asset.type)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-sm truncate">
                          {asset.title}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {asset.type}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Related Meetings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">Related Meetings</h3>
            <Dialog
              open={showLinkMeetingDialog}
              onOpenChange={setShowLinkMeetingDialog}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadAvailableMeetings}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Link Meeting
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Link Meeting to Task</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {availableMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                        onClick={() => handleLinkMeeting(meeting.id)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {extractMeetingTitle(meeting.summary)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(meeting.date_time).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="outline">{meeting.status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          {relatedMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No meetings linked to this task
            </p>
          ) : (
            <div className="space-y-2">
              {relatedMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="group flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {extractMeetingTitle(meeting.summary)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(meeting.date_time).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{meeting.status}</Badge>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnlinkMeeting(meeting.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
