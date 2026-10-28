import type { Metadata } from "next";
import { notFound } from "next/navigation";

import PublicMenuView from "@/components/public-menu/public-menu-view";
import { getPublicMenu } from "@/lib/public-menu";

export async function generateMetadata(
  props: PageProps<"/menu/[restaurantSlug]">,
): Promise<Metadata> {
  const { restaurantSlug } = await props.params;
  const menu = await getPublicMenu(restaurantSlug);

  if (!menu) return {};

  return {
    title: `${menu.restaurantName} – Menu`,
    description: `Menu and prices for ${menu.restaurantName}.`,
  };
}

export default async function PublicMenuPage(
  props: PageProps<"/menu/[restaurantSlug]">,
) {
  const { restaurantSlug } = await props.params;
  const menu = await getPublicMenu(restaurantSlug);

  if (!menu) notFound();

  if (!menu.open) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-[#f5f2ea]">
        <h1 className="text-2xl font-medium">
          This menu isn&apos;t available right now
        </h1>

        <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
          Please check back later or ask a member of staff.
        </p>
      </main>
    );
  }

  return (
    <PublicMenuView
      restaurantName={menu.restaurantName}
      categories={menu.categories}
    />
  );
}
