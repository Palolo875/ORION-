import { Image, FileText, Clipboard, Camera, File } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";

interface UploadPopoverProps {
  onFileSelect?: (files: FileList | null) => void;
}

export const UploadPopover = ({ onFileSelect }: UploadPopoverProps) => {
  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast({
          title: "Image ajoutée",
          description: file.name,
        });
      }
    };
    input.click();
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        toast({
          title: "Fichier ajouté",
          description: file.name,
        });
      }
    };
    input.click();
  };

  const handleClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        toast({
          title: "Presse-papiers collé",
          description: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au presse-papiers",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 sm:gap-3 rounded-xl sm:rounded-2xl hover:bg-accent/50 transition-colors py-2 sm:py-3 h-auto"
        onClick={handleImageUpload}
      >
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10">
          <Image className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
        <span className="text-xs sm:text-sm font-medium">Ajouter une image</span>
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 sm:gap-3 rounded-xl sm:rounded-2xl hover:bg-accent/50 transition-colors py-2 sm:py-3 h-auto"
        onClick={handleFileUpload}
      >
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
        <span className="text-xs sm:text-sm font-medium">Ajouter un fichier</span>
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 sm:gap-3 rounded-xl sm:rounded-2xl hover:bg-accent/50 transition-colors py-2 sm:py-3 h-auto"
        onClick={handleClipboard}
      >
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary/10">
          <Clipboard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
        <span className="text-xs sm:text-sm font-medium">Coller du presse-papiers</span>
      </Button>
    </div>
  );
};
