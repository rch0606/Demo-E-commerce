import VisitEditClient from './index.client'

export default function VisitEdit(props: any) {
  const id =
    props?.initPageResult?.docID ||
    props?.id ||
    props?.params?.segments?.[props?.params?.segments?.length - 1]

  return <VisitEditClient id={id} initialDoc={props?.doc || null} />
}
