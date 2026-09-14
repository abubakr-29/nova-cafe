import MenuPageClient from "@/components/customer/menu-page-client";

export default async function Page(
  props: PageProps<"/menu/[restaurantSlug]/[tableId]">,
) {
  const { restaurantSlug, tableId } = await props.params;

  return <MenuPageClient restaurantSlug={restaurantSlug} tableId={tableId} />;
}
