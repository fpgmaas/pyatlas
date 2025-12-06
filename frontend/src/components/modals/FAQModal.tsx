import { Modal } from "./Modal";
import { useModal } from "../../hooks/useModal";

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
}

function FAQItem({ question, answer }: FAQItemProps) {
  return (
    <div className="border-b border-gray-700/30 pb-4 last:border-b-0 last:pb-0">
      <h3 className="text-sm font-medium text-gray-100 mb-2">{question}</h3>
      <div className="text-sm text-gray-400 leading-relaxed">{answer}</div>
    </div>
  );
}

export function FAQModal() {
  const { isOpen, close } = useModal("faq");

  return (
    <Modal isOpen={isOpen} onClose={close} title="FAQ" size="md">
      <div className="space-y-4">
        <FAQItem
          question="What is PyAtlas?"
          answer="PyAtlas is an interactive map of the top 10,000 Python packages on PyPI. Packages with similar functionality are positioned close together, making it easy to discover alternatives or related tools."
        />
        <FAQItem
          question="How does this work?"
          answer="Package descriptions are converted into vector embeddings using Sentence Transformers. These embeddings are reduced to 2D coordinates using UMAP, while HDBSCAN groups packages into clusters. Cluster labels are generated using OpenAI's gpt-5-mini."
        />
        <FAQItem
          question="How is popularity measured?"
          answer="Package popularity is based on weekly downloads from PyPI. The size of each star represents its relative popularity."
        />
        <FAQItem
          question="What are the constellations?"
          answer="The constellations are only for aesthetics. They connect the most popular packages in a cluster and don't serve any actual function."
        />
        <FAQItem
          question="Where can I learn more?"
          answer={
            <>
              PyAtlas is open source! Visit the{" "}
              <a
                href="https://github.com/fpgmaas/pyatlas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                GitHub repository
              </a>{" "}
              for technical details, to contribute, or to report issues.
            </>
          }
        />
      </div>
    </Modal>
  );
}
