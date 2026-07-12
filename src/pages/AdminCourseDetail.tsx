import CourseDetail from "@/pages/CourseDetail";
import { AdminLayout } from "@/components/admin/AdminLayout";

const AdminCourseDetail = () => (
  <AdminLayout
    title="Learning"
    description="Manage this course, modules, lessons, and course content."
  >
    <CourseDetail adminView />
  </AdminLayout>
);

export default AdminCourseDetail;
