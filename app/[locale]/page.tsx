import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "@/components/LandingPage";

type Props = { params: Promise<{ locale: string }> };

export default async function LocaleRootPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect(`/${locale}/dashboard`);
  }

  return <LandingPage />;
}
