export async function generateMetadata({ params }) {
  const { id } = (await params) ?? {};
  return {
    title: id ? `WO #${id}` : "Work Order",
  };
}

export default function WorkOrderDetailLayout({ children }) {
  return children;
}
