import { ClientStory } from '@/components/client-story/ClientStory';
import { clientStoryDemoProject, clientStoryDemoEntries, clientStoryDemoComments } from '@/data/clientStoryDemo';

/** Misma experiencia que el cliente, con contenido ficticio y sin llamadas de escritura. */
export function ClientStoryDemo() {
  return <ClientStory
    project={clientStoryDemoProject}
    entries={clientStoryDemoEntries}
    comments={clientStoryDemoComments}
    demo
    backHref={`${import.meta.env.BASE_URL}#showcase`}
  />;
}
