"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, MessageSquare, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { UserInfoSignOut } from "@/features/user-auth-status";
import { useAuthContext } from "@/providers/Auth";

export function Navbar({
  onChatNavigate,
  onEmpresasNavigate,
}: {
  onChatNavigate?: () => Promise<void> | void;
  onEmpresasNavigate?: () => Promise<void> | void;
}) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthContext();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Link
          href="/"
          className="mr-6 flex items-center"
        >
          <span className="text-xl font-bold">
            about:blanc
          </span>
        </Link>
        <div className="hidden md:flex">
          <NavigationMenu>
            <NavigationMenuList>
              {isAuthenticated && (
                <>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                      asChild
                    >
                      <Link
                        href="/"
                        onClick={async (e) => {
                          if (onChatNavigate) {
                            e.preventDefault();
                            await onChatNavigate();
                          }
                        }}
                      >
                        Chat
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                    <NavigationMenuLink
                      className={navigationMenuTriggerStyle()}
                      asChild
                    >
                      <Link
                        href="/empresas"
                        onClick={async (e) => {
                          if (onEmpresasNavigate) {
                            e.preventDefault();
                            await onEmpresasNavigate();
                          }
                        }}
                      >
                        Empresas
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden items-center space-x-3 md:flex">
            <UserInfoSignOut />
          </div>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Alternar menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menú</SheetTitle>
              </SheetHeader>
              <nav className="flex h-full flex-col gap-1 px-2">
                {isAuthenticated && (
                  <>
                    <SheetClose asChild>
                      <Link
                        href="/"
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-base hover:bg-accent hover:text-accent-foreground",
                          pathname === "/" && "bg-accent text-accent-foreground",
                        )}
                        onClick={async (e) => {
                          if (onChatNavigate) {
                            e.preventDefault();
                            setSheetOpen(false);
                            // let the sheet close animation finish
                            await new Promise((res) => setTimeout(res, 200));
                            await onChatNavigate();
                          }
                        }}
                      >
                        <MessageSquare className="mr-3 h-5 w-5" />
                        Chat
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link
                        href="/empresas"
                        className={cn(
                          "flex items-center rounded-md px-3 py-2 text-base hover:bg-accent hover:text-accent-foreground",
                          pathname?.startsWith("/empresas") && "bg-accent text-accent-foreground",
                        )}
                        onClick={async (e) => {
                          if (onEmpresasNavigate) {
                            e.preventDefault();
                            setSheetOpen(false);
                            // let the sheet close animation finish
                            await new Promise((res) => setTimeout(res, 200));
                            await onEmpresasNavigate();
                          }
                        }}
                      >
                        <CreditCard className="mr-3 h-5 w-5" />
                        Empresas
                      </Link>
                    </SheetClose>
                  </>
                )}
              </nav>
              <Separator className="my-1" />
              <SheetFooter className="mt-auto px-2 pb-2">
                <div className="rounded-md border bg-muted/50 px-3 py-3">
                  <UserInfoSignOut />
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none",
            className,
          )}
          {...props}
        >
          <div className="text-sm leading-none font-medium">{title}</div>
          <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
