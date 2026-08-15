"use client";
// hooks/useConfig.js
// Subscribes to the central app config (app_config row) and returns it merged
// with defaults, so components always have a usable config object.
import { useEffect, useState } from "react";
import { DEFAULT_CONFIG, subscribeConfig } from "@/utils/config";

export default function useConfig() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeConfig((merged) => {
            setConfig(merged);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    return { config, loading };
}
