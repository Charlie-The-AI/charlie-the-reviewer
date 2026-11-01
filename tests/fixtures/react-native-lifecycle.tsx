import React, { useEffect, useState } from "react";
import { View, Text, AppState, AppStateStatus } from "react-native";

export function LocationTracker() {
  const [status, setStatus] = useState<string>("active");

  useEffect(() => {
    // Bug: AppState subscription added without removing listener in cleanup, leaking memory and sockets
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      setStatus(nextAppState);
    });

    // Missing: return () => subscription.remove();
  }, []);

  return (
    <View>
      <Text>App State: {status}</Text>
    </View>
  );
}
