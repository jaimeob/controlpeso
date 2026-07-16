import PatientIntakeForm from "@/app/components/patient-intake-form";
export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <PatientIntakeForm patientId={id} />; }
