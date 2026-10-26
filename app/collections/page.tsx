import { products } from "../data";
import { CollectionsClient } from "./collections-client";
import { toCollectionProducts } from "./collection-products";

export default function CollectionsPage() {
  return <CollectionsClient products={toCollectionProducts(products)}/>;
}
