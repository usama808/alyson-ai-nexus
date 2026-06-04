import { Link } from "@tanstack/react-router";
import { Copy, ExternalLink, FileText, MoreHorizontal, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ArticleRowMenuProps = {
  id: number;
  title: string;
  sourceUrl?: string | null;
};

export function ArticleRowMenu({ id, title, sourceUrl }: ArticleRowMenuProps) {
  const copySourceLink = async () => {
    if (!sourceUrl) return;
    try {
      await navigator.clipboard.writeText(sourceUrl);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={`Actions for ${title}`}
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link to="/articles/$articleId" params={{ articleId: String(id) }} className="cursor-pointer">
            <Pencil className="h-4 w-4" />
            Edit in CMS
          </Link>
        </DropdownMenuItem>
        {sourceUrl ? (
          <>
            <DropdownMenuItem asChild>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                <ExternalLink className="h-4 w-4" />
                Open original source
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copySourceLink}>
              <Copy className="h-4 w-4" />
              Copy source URL
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem disabled>
            <FileText className="h-4 w-4" />
            No source URL
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
