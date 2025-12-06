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
          answer="PyAtlas is an interactive visualization of the top 10,000 Python packages on PyPI, organized by their functionality and relationships."
        />
        <FAQItem
          question="How are clusters determined?"
          answer="Packages are grouped into clusters based on their descriptions and dependencies using machine learning techniques. Each cluster represents packages with similar functionality."
        />
        <FAQItem
          question="How is popularity measured?"
          answer="Package popularity is measured by weekly downloads from PyPI. The size of each point represents relative popularity."
        />
        <FAQItem
          question="How can I contribute?"
          answer={
            <>
              PyAtlas is open source! Visit our{" "}
              <a
                href="https://github.com/fpgmaas/pyatlas"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                GitHub repository
              </a>{" "}
              to contribute or report issues.
            </>
          }
        />
      </div>
    </Modal>
  );
}
