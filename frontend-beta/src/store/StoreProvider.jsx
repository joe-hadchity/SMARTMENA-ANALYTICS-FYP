import { createContext, useEffect, useMemo, useReducer } from "react";

const STORAGE_KEY = "smartmena.beta.v1";

const initialState = {
  campaigns: [],
  posts: [],
  sentiments: [],
  predictions: [],
};

function reducer(state, action) {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "addCampaign":
      return {
        ...state,
        campaigns: [action.campaign, ...state.campaigns],
      };
    case "addPost":
      return {
        ...state,
        posts: [action.post, ...state.posts],
      };
    case "addSentiment":
      return {
        ...state,
        sentiments: [
          { ...action.sentiment, _at: Date.now() },
          ...state.sentiments,
        ],
      };
    case "addPrediction":
      return {
        ...state,
        predictions: [
          { ...action.prediction, _at: Date.now() },
          ...state.predictions,
        ],
      };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      sentiments: Array.isArray(parsed.sentiments) ? parsed.sentiments : [],
      predictions: Array.isArray(parsed.predictions) ? parsed.predictions : [],
    };
  } catch {
    return null;
  }
}

export const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const loaded = loadFromStorage();
    if (loaded) dispatch({ type: "hydrate", state: loaded });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota exceeded or storage unavailable; ignore so the UI keeps working.
    }
  }, [state]);

  const value = useMemo(
    () => ({
      ...state,
      actions: {
        addCampaign: (campaign) => dispatch({ type: "addCampaign", campaign }),
        addPost: (post) => dispatch({ type: "addPost", post }),
        addSentiment: (sentiment) => dispatch({ type: "addSentiment", sentiment }),
        addPrediction: (prediction) =>
          dispatch({ type: "addPrediction", prediction }),
        reset: () => dispatch({ type: "reset" }),
      },
    }),
    [state],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
