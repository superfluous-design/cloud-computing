import "./App.css";
import { useShape } from "@electric-sql/react";

function App() {
  const { data } = useShape({
    url: `http://localhost:30000/v1/shape`,
    params: {
      table: `bkmrks`,
    },
  });

  return (
    <>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}

export default App;
