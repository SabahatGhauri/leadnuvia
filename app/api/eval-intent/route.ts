export async function POST() {
  return Response.json(
    { error: "This legacy endpoint has been retired." },
    { status: 410 },
  );
}
