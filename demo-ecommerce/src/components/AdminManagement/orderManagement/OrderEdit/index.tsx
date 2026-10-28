import OrderEditClient from "./index.client";

export default function OrderEdit(props: any) {
  const user =
    props?.initPageResult?.req?.user ||
    props?.user ||
    props?.initPageResult?.user ||
    null

  const role = user?.role ? String(user.role) : ''
  const canSeeVisitSession = role === 'owner' || role === 'admin'

  return (
    <OrderEditClient
      id={props.initPageResult.docID}
      order={props.doc}
      canSeeVisitSession={canSeeVisitSession}
    />
  )
}