
export interface FeatureFlag {
    name: string;
    description: string;
    stage: 'GA' | 'experimental';
    docsURL?: string;
    expression?: string;

    requiresDevMode?: boolean;
    frontend?: boolean;

    // Not returned from the API (may be local to user)
    enabled?: boolean;
    local?: boolean;
    enabledByDefault?: boolean;
}

export type LocalFlags = Record<string,boolean>;
