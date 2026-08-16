import os
from typing import Annotated, TypedDict
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

from langchain_groq import ChatGroq

LANGUAGE_LABELS = {
    "python": "Python",
    "cpp": "C++",
    "java": "Java",
}


class TutorState(TypedDict):
    messages: Annotated[list, add_messages]
    language: str


def _system_prompt(language: str) -> str:
    label = LANGUAGE_LABELS.get(language, "Python")
    return (
        "You are Code Ninja, a friendly but precise personal DSA "
        "(Data Structures & Algorithms) tutor.\n"
        "Rules you always follow:\n"
        f"- Write every code example in {label}, unless the user explicitly "
        "asks for another language.\n"
        "- Be technically correct. If you are not sure about a detail, say so "
        "instead of guessing.\n"
        "- Prefer short, clear explanations over long ones. Use bullet points "
        "for steps.\n"
        "- When explaining an algorithm, always give: (1) the core idea in "
        "plain English, (2) the time and space complexity, and (3) a small "
        "code example.\n"
        "- Use Markdown code fences with the correct language tag "
        "(e.g. ```python, ```cpp, ```java) so the snippet renders correctly.\n"
        "- If the user's own code has a bug, point out exactly what's wrong "
        "before showing the fix."
        "-If the user ask anything other than Data Structures & Algorithms reply them sarcastic answers."
    )



def _build_model():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set in backend/.env")
    
    return ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=api_key,
        temperature=0.4,
    )


def _tutor_node(state: TutorState):
    model = _build_model()
    system = SystemMessage(content=_system_prompt(state.get("language", "python")))
    response = model.invoke([system, *state["messages"]])
    return {"messages": [response]}


def build_graph():
    graph = StateGraph(TutorState)
    graph.add_node("tutor", _tutor_node)
    graph.add_edge(START, "tutor")
    graph.add_edge("tutor", END)
    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


CODE_NINJA_GRAPH = build_graph()

def ask_code_ninja(thread_id: str, user_text: str, language: str) -> str:
    """Send one user message through the graph and return the reply text."""
    config = {"configurable": {"thread_id": thread_id}}
    
    state = CODE_NINJA_GRAPH.get_state(config)
    if not state.values or "messages" not in state.values or not state.values["messages"]:
        import history_store
        thread = history_store.get_thread(thread_id)
        if thread and thread.get("messages"):
            past_messages = []
            for msg in thread["messages"]:
                content = msg["content"]
                
                if isinstance(content, list):
                    text_parts = []
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "text":
                            text_parts.append(block.get("text", ""))
                        elif isinstance(block, str):
                            text_parts.append(block)
                    content = "".join(text_parts)
                
                if msg["role"] == "user":
                    past_messages.append(HumanMessage(content=str(content)))
                else:
                    past_messages.append(AIMessage(content=str(content)))

            CODE_NINJA_GRAPH.update_state(config, {"messages": past_messages, "language": language})

    result = CODE_NINJA_GRAPH.invoke(
        {"messages": [HumanMessage(content=user_text)], "language": language},
        config=config,
    )
    last = result["messages"][-1]
    if isinstance(last, AIMessage):
        return last.content
    return str(last.content)