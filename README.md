# Example of using Google Cloud Platform APIs from JavaScript/HTML

I sometimes do translations of Portuguese to English. Whilst I can do this
manually, I find it way quicker to have Google Translate create the English
version and create a first draft, which I then copy edited.

The copy editing step is needed because Google Translate is very literal in
it's translations and leaves lots of parentheticals in the English text.

A contrived example:
> The holidays, which started at the beginning of August, were unusually hot,
> normally it would be more humid, but relaxing.

So I added a cleanup step using Gemini to try and make the first draft more
idiomatic, which is somewhat successful.

This workflow started off in a Jupyter notebook. But I wanted to have something
a bit more accessible for updating the stages of the text, so I created this
HTML+JavaScript interface.

The advantage is it allows you to see the translation - check it's correct and
update it before copy editing it.

It requires:
* serving from localhost (because of CORS)
* That you have a GCP project with the Translate and Vertex APIs enabled
* That you've generated an access token for the project

The project ID + API key are stored in localStorage so they survive refreshing
the page, but the APIK key times out pretty quickly.

I haven't tried skipping the Translate step, it may be that the Gemini LLM is
good enough to the translation + changes in one step.
