import { Folder } from "lucide-react";
import { Card } from "@/components/ui/card";

interface FolderData {
  id: string;
  name: string;
  color: string;
}

interface PublicFolderCardProps {
  folder: FolderData;
  viewMode: "grid" | "list";
  onClick: () => void;
}

export function PublicFolderCard({ folder, viewMode, onClick }: PublicFolderCardProps) {
  if (viewMode === "list") {
    return (
      <Card 
        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-md"
            style={{ backgroundColor: `${folder.color}20` }}
          >
            <Folder 
              className="h-5 w-5" 
              style={{ color: folder.color }}
            />
          </div>
          <span className="font-medium truncate">{folder.name}</span>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors group"
      onClick={onClick}
    >
      <div className="flex flex-col items-center text-center">
        <div 
          className="p-3 rounded-lg mb-2 group-hover:scale-105 transition-transform"
          style={{ backgroundColor: `${folder.color}20` }}
        >
          <Folder 
            className="h-8 w-8" 
            style={{ color: folder.color }}
          />
        </div>
        <span className="text-sm font-medium truncate w-full">{folder.name}</span>
      </div>
    </Card>
  );
}
