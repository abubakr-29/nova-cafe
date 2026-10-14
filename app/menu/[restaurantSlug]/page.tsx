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

  return (
    <PublicMenuView
      restaurantName={menu.restaurantName}
      categories={menu.categories}
    />
  );
}
