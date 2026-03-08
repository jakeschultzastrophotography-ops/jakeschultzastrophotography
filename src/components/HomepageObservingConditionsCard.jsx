import React from "react";
import ObservingConditionsWidget from "./ObservingConditionsWidget";

function joinClasses(...values) {
  return values.filter(Boolean).join(" ");
}

export default function HomepageObservingConditionsCard({
  sectionClassName = "",
  cardClassName = "",
  innerClassName = "",
}) {
  return (
    <section className={joinClasses("mx-auto mt-2 w-full max-w-5xl px-4 sm:mt-3 sm:px-6 lg:px-8", sectionClassName)}>
      <div className={joinClasses("", cardClassName)}>
        <div className={joinClasses("", innerClassName)}>
          <ObservingConditionsWidget
            variant="mini"
            className="border-0 bg-transparent shadow-none"
            showLocationPicker={false}
            showHourlyStrip={false}
            showExtendedAstronomy={false}
          />
        </div>
      </div>
    </section>
  );
}
