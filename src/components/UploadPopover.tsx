import { Image, FileText, Clipboard } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "@/hooks/use-toast";

export const UploadPopover = () => {
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
        className="w-full justify-start gap-3 rounded-2xl hover:bg-accent/50 transition-colors"
        onClick={handleImageUpload}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Image className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium">Ajouter une image</span>
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3 rounded-2xl hover:bg-accent/50 transition-colors"
        onClick={handleFileUpload}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium">Ajouter un fichier</span>
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start gap-3 rounded-2xl hover:bg-accent/50 transition-colors"
        onClick={handleClipboard}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Clipboard className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-medium">Coller du presse-papiers</span>
      </Button>
    </div>
  );
};
