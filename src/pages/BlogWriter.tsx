import { MainLayout } from "@/components/MainLayout";
import { BlogWriterMain } from "@/components/blog/BlogWriterMain";

export default function BlogWriter() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8">
        <BlogWriterMain />
      </div>
    </MainLayout>
  );
}
