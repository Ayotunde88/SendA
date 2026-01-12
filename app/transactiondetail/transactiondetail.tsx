// mobile-app/app/transactiondetail/[reference].tsx
import { useLocalSearchParams } from "expo-router";
import TransactionDetailScreen from "../../components/src/screens/TransactionDetailScreen";

export default function TransactionDetailRoute() {
  const { reference } = useLocalSearchParams<{ reference: string }>();
  return <TransactionDetailScreen reference={reference} />;
}
