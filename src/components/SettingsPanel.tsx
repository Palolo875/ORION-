import { X, User, Settings, BarChart3, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useState } from "react";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel = ({ isOpen, onClose }: SettingsPanelProps) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 glass border-l border-[hsl(var(--glass-border))] animate-slide-in-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-2xl font-semibold">Paramètres</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-accent/50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs defaultValue="account" className="w-full">
              <TabsList className="grid w-full grid-cols-3 glass rounded-2xl p-1">
                <TabsTrigger value="account" className="rounded-xl gap-2">
                  <User className="h-4 w-4" />
                  Compte
                </TabsTrigger>
                <TabsTrigger value="settings" className="rounded-xl gap-2">
                  <Settings className="h-4 w-4" />
                  Réglages
                </TabsTrigger>
                <TabsTrigger value="usage" className="rounded-xl gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Usage
                </TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="mt-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Informations du compte</h3>
                  <p className="text-sm text-muted-foreground">
                    Gérez vos informations personnelles et vos préférences.
                  </p>
                </div>
                <div className="glass rounded-3xl p-6 space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-base font-medium">utilisateur@example.com</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Abonnement</p>
                    <p className="text-base font-medium">Plan Gratuit</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Apparence</h3>
                  <p className="text-sm text-muted-foreground">
                    Personnalisez l'apparence de l'interface.
                  </p>
                </div>
                <div className="glass rounded-3xl p-6 space-y-4">
                  <p className="text-sm font-medium">Thème</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      onClick={() => toggleTheme("light")}
                      className="h-20 flex-col gap-2 rounded-2xl"
                    >
                      <Sun className="h-6 w-6" />
                      <span className="text-sm font-medium">Clair</span>
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      onClick={() => toggleTheme("dark")}
                      className="h-20 flex-col gap-2 rounded-2xl"
                    >
                      <Moon className="h-6 w-6" />
                      <span className="text-sm font-medium">Sombre</span>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="usage" className="mt-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Utilisation</h3>
                  <p className="text-sm text-muted-foreground">
                    Suivez votre utilisation des ressources.
                  </p>
                </div>
                <div className="glass rounded-3xl p-6 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Messages ce mois</span>
                      <span className="text-muted-foreground">24 / 100</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: "24%" }} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
};
