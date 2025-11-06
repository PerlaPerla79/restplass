import SlotsClient from './SlotsClient';

export const revalidate = 0;

export default function Page() {
  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Ledige bord – neste 6 timer · v-test-2</h1>
      <SlotsClient />
    </main>
  );
}
